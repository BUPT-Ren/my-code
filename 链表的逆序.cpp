# include<iostream>
# include<ctime>
# include<cstdlib>
# include<algorithm>
# include<vector>
using namespace std;

//单链表的代码实现
//节点类型
struct Node{
    Node(int data = 0):data_ (data),next_(nullptr) {}
    ~Node(){
        //节点的释放
    }
    int data_; //数据域  末尾的下划线是经典的结构体 int占四个字节 一个节点占8个字节 
               //或类的成员变量的命名方式 
    Node * next_;
};

class Clink{
    public:
        Clink(){
            //给head_初始化指向头节点
            head_ = new Node();//new会返回一个地址
        }
        ~Clink(){
            // 释放所有节点，避免内存泄漏
            //别写成 delete[] head_; 这是数组内存释放 只删除头节点就找不到后面的节点了
            //不需要释放指针p,因为这是个局部变量，函数结束后自动消失
            Node *p = head_; //这里的删除是不包括头节点的，方便我们之后能够找到这个链表
            while (p != nullptr) {
                Node *q = p->next_;
                delete p;
                p = q;
            }
        }
    public:
           //链表的尾插法  如果不定义尾指针，需要遍历链表
        void Inserttrail(int val){
            //先找到当前链表的末尾节点
            Node *p = head_;
            while(p->next_ != nullptr){
                p = p->next_;
            }
            //先要有一个新节点
            Node *node = new Node(val);//这个节点存档val
            //把新节点挂在尾节点后面
            p->next_ = node;
        }
       //单链表的逆序 为什么要传list引用 因为我们要直接对link进行操作
       //传形参相当于是在内存中重新开辟了一些内存把link拷贝过来操作
       //link本身不会改变
        void Reverselink(Clink &link){
            Node *p = link.head_->next_; //指向第一个节点
            if (p == nullptr){
                return;
            }
            else{
                link.head_->next_ = nullptr;//先把头节点置空
                
                while(p != nullptr){
                    //p指针指向的节点进行头插
                Node *q = p->next_;
                p->next_ = link.head_->next_;//p指向节点的指针置空
                link.head_->next_ = p;
                p = q;
                }
                
            }
        }
        //单链表倒数第k个节点
        //先求出链表中节点的总个数 N 
        //指针从左边开始搜索 要移动 N-k+1次 注意这里指针指向第一节点
        //这种遍历的方式需要遍历2遍 第一遍获得N 第二遍找到倒数第k个节点
        //考虑查询可能成功也可能失败 返回bool
        //对val引用 外部可见
        bool GetLaskknode(Clink &link,int k,int &val){
        //首先 要让pre 和 p 都指向头节点 
            Node *head = head_;  //按照规范，成员函数一般不直接对成员变量操作
            if (k <= 0) {
                return false;  // k 必须 >= 1，倒数第0个或负数无意义
            }
            Node *pre = head;
            Node *p = head;
            for(int i = 0; i < k; i++){
                p = p->next_;
                if(p == nullptr){
                    return false;
                }
            }

            //此时，pre指向头节点，p指向正数第k个节点
            while(p != nullptr){
                pre = pre->next_;
                p = p->next_;
            }
            val = pre->data_;
            return true;
        }
        //有序单链表的合并 注意一定是有序 
        //按照指定的规则 （从小到大）排序 定义两个指针
        //用 p 和 q两个指针分别指向两个链表 last指向已经连接好的末尾节点
        //头指针不能移动 所以 Node *last = head_;
        //打印链表
        //如果把两个链表转化成数组然后直接sort 相当于用空间换时间
        
        
        /*
        合并过程把 link2 的所有节点都接到了 link1 上，
        但 link2.head_->next_ 仍然指向它原来的第一个节点。于是：

        link1 析构时会遍历释放这些节点；
        link2 析构时也会遍历释放同一批节点。
        同一块内存被 delete 两次，属于未定义行为，通常会直接崩溃。
        */
        void MergeLink(Clink & link1,Clink &link2){
            Node *p = link1.head_->next_; //指向第一个节点
            Node *q = link2.head_->next_; //指向第一个节点
            Node *last = link1.head_;
            while(p != nullptr && q != nullptr){
                if(p->data_ < q->data_){
                    last->next_ = p;
                    p = p->next_;
                    last = last->next_;
                }
                else{
                    last->next_ = q;
                    q = q->next_;
                    last = last->next_;
                }
            }
            //判断谁先为空
            if (p != nullptr){
                last->next_ = p;
            }
            if (q != nullptr){
                last->next_ = q;
            }
            //因为节点全部挂到link1上，所以在析构link1，link2之前
            //先 link2.head_->next_= nullptr;
            link2.head_ ->next_= nullptr;
        }
        void Show() const {
            Node *p = head_->next_;
            while (p != nullptr) {
                cout << p->data_ << " ";
                p = p->next_;
            }
            cout << endl;
        }
        //单链表是否存在环 找出环的末尾节点
        //有一种想法是这样，开辟出一个数组存放遍历节点地址，如果在数组中找到了
        //相同的地址
        //说明肯定是有环 这种方法有O(n)的空间复杂度。
        //还可以考虑双指针：快慢指针
        //环地入口在哪里 首先环的入口不一定在快慢指针重合的地方
        bool IsLinkHasCircle(Node *head,int &val){
            //定义快慢指针
            Node *fast = head; //  遍历同一个链表
            Node *slow = head;
            while(fast != nullptr && fast->next_ != nullptr){
                slow = slow->next_;  
                fast = fast->next_->next_; //fast不为空 slow肯定不为空
                if(slow == fast){
                    //快慢指针再次遇见，链表存在环
                    //接下来找还的入口节点；
                    //这个算法的核心是起步的节点和找入口时的
                    //重置节点应是同一个节点
                    fast = head;
                    while(fast != slow){
                        slow = slow->next_;
                        fast = fast->next_;
                    }
                    //他们会在入口相遇
                    val = slow->data_;
                      return true;
                 }
            }
                    return false;
        }
        //判断两个单链表是否相交(g共用节点)
        //还是可以考虑数组的方法 把两个链表的数据分别存放到
        //两个数组内，但这种方式时间和空间复杂度都大
        //所谓的链表相交，是指从相交的节点开始，两个链表就开始共用节点
        //所以这里的核心是先让较长的链表的那个指针先往前走差值步，然后
        //两个链表在一起走。
        bool IsLinkHasMerge(Node *head_1,Node *head_2,int &val){
            //记录两个链表的长度
            int cnt1 = 0;
            int cnt2 = 0;
            Node *p = head_1->next_;
            Node *q = head_2->next_;
            while(p != nullptr){   //计算两个链表的长度
                cnt1++;
                p = p->next_;
            }
            while(q != nullptr){
                cnt2++;
                q = q->next_;
            }
             p = head_1;
             q = head_2;
            //将较长的链表的指针向后移动差值个位置（准备工作）
            if (cnt1 > cnt2){
                int offset = cnt1 - cnt2;
                for (int i = 0;i < offset;i++){
                    p = p->next_;
                }
            }
            if (cnt1 < cnt2){
                int offset = cnt2 - cnt1;
                for (int i = 0;i < offset;i++){
                    q = q->next_;
                }
            }
            //开始寻找公用节点
            while (p != nullptr && q != nullptr){
                if (p == q){
                    val = p->data_;
                    return true;
                }
                p = p->next_;
                q = q->next_;
            }
            return false;
        }
        //删除链表倒数第k个节点
        //注意：这里需要先找到倒数第N+1个节点，因为如果让指针直接指向删除的节点
        //则该节点被删除后无法找到上一个节点，也就不能让其连接倒数第N-1个节点
        //注意：这里删除有可能会删头节点，所以需要先让头指针指向第一个节点
        // 删除链表倒数第 n 个节点，返回新的头节点（head 指向第一个数据节点）
        Node* RemoveNodefromHead(Node *head, int n){
            Node *p = head;
            Node *q = head;
            // p 先走 n 步，让 p 领先 q n 个节点
            for (int i = 0 ; i < n ; i++ ){
                if (p == nullptr){
                    return head; // n > 链表长度，无法删除
                }
                p = p->next_;
            }
            // for 结束后 p 为 null，说明 n 正好 == 链表长度，要删的是头节点本身
            if (p == nullptr){
                Node *target = head;
                head = head->next_;
                delete target;
                return head;
            }
            // p、q 同步前进，直到 p 到最后一个节点，此时 q 是待删节点的前驱
            while (p->next_ != nullptr){
                p = p->next_;
                q = q->next_;
            }
            Node *target = q->next_;
            q->next_ = target->next_;
            delete target;
            return head;
        }
        //测试用：读取第 i 个数据节点（从 0 开始），越界返回 false
        bool GetNode(int i, int &val) const {
            Node *p = head_->next_;
            for (int j = 0; j < i && p != nullptr; j++) {
                p = p->next_;
            }
            if (p == nullptr) {
                return false;
            }
            val = p->data_;
            return true;
        }
    private:
        Node *head_;//指向链表的头节点
};

// MergeLink 测试：n1、n2 为两个链表的长度
void testMerge(int n1, int n2) {
    // 随机填充并排序，保证两个链表各自有序
    vector<int> a1(n1), a2(n2);
    for (int i = 0; i < n1; i++) a1[i] = rand() % 100;
    for (int i = 0; i < n2; i++) a2[i] = rand() % 100;
    sort(a1.begin(), a1.end());
    sort(a2.begin(), a2.end());

    Clink link1, link2;
    for (int i = 0; i < n1; i++) link1.Inserttrail(a1[i]);
    for (int i = 0; i < n2; i++) link2.Inserttrail(a2[i]);

    // 期望结果：两个有序数组归并后仍是升序
    vector<int> expect(a1);
    expect.insert(expect.end(), a2.begin(), a2.end());
    sort(expect.begin(), expect.end());

    cout << "link1(" << n1 << "): "; link1.Show();
    cout << "link2(" << n2 << "): "; link2.Show();

    link1.MergeLink(link1, link2);
    cout << "合并后: "; link1.Show();

    // 逐节点校验
    bool ok = true;
    for (int i = 0; i < (int)expect.size(); i++) {
        int v = 0;
        if (!link1.GetNode(i, v) || v != expect[i]) {
            ok = false;
            break;
        }
    }
    int extra = 0;
    if (link1.GetNode((int)expect.size(), extra)) {
        ok = false; // 节点数比预期多
    }
    cout << "结果: " << (ok ? "通过" : "失败") << endl << endl;
}

// 释放一个无环链表的所有节点（带环的链表必须先断环再调用）
void deleteList(Node *head) {
    while (head != nullptr) {
        Node *next = head->next_;
        delete head;
        head = next;
    }
}

// IsLinkHasCircle 测试
void testCircle() {
    cout << "=== IsLinkHasCircle 测试 ===" << endl;
    Clink tmp; // 仅用作调用成员函数；函数内部只用传入的 head，不碰 tmp.head_

    // 用例1：无环链表 1->2->3
    {
        Node *n1 = new Node(1);
        Node *n2 = new Node(2);
        Node *n3 = new Node(3);
        n1->next_ = n2;
        n2->next_ = n3;
        int val = -1;
        bool has = tmp.IsLinkHasCircle(n1, val);
        cout << "无环链表: " << (has ? "有环(错误)" : "无环(正确)") << endl;
        deleteList(n1);
    }

    // 用例2：环入口是中间节点 1->2->3->4->5->2
    {
        Node *n1 = new Node(1);
        Node *n2 = new Node(2);
        Node *n3 = new Node(3);
        Node *n4 = new Node(4);
        Node *n5 = new Node(5);
        n1->next_ = n2; n2->next_ = n3; n3->next_ = n4; n4->next_ = n5;
        n5->next_ = n2; // 环入口：节点2
        int val = -1;
        bool has = tmp.IsLinkHasCircle(n1, val);
        cout << "环入口=中间节点: " << (has ? "有环" : "无环(错误)")
             << " 入口=" << val << " (期望 2)" << endl;
        n5->next_ = nullptr; // 断环后再释放
        deleteList(n1);
    }

    // 用例3：环入口是第一个节点 1->2->3->1
    {
        Node *n1 = new Node(1);
        Node *n2 = new Node(2);
        Node *n3 = new Node(3);
        n1->next_ = n2; n2->next_ = n3;
        n3->next_ = n1; // 环入口：节点1
        int val = -1;
        bool has = tmp.IsLinkHasCircle(n1, val);
        cout << "环入口=头节点: " << (has ? "有环" : "无环(错误)")
             << " 入口=" << val << " (期望 1)" << endl;
        n3->next_ = nullptr;
        deleteList(n1);
    }

    // 用例4：单节点自环 1->1
    {
        Node *n1 = new Node(1);
        n1->next_ = n1;
        int val = -1;
        bool has = tmp.IsLinkHasCircle(n1, val);
        cout << "单节点自环: " << (has ? "有环" : "无环(错误)")
             << " 入口=" << val << " (期望 1)" << endl;
        n1->next_ = nullptr;
        deleteList(n1);
    }
}

// IsLinkHasMerge 测试
void testIntersect() {
    cout << "=== IsLinkHasMerge 测试 ===" << endl;
    Clink tmp; // 仅用作调用成员函数

    // 用例1：相交链表，交点在中间 (d1: a b c d, d2: x c d)
    {
        Node *d1 = new Node();
        Node *d2 = new Node();
        Node *a = new Node(1), *b = new Node(2), *c = new Node(3), *d = new Node(4);
        Node *x = new Node(9);
        d1->next_ = a; a->next_ = b; b->next_ = c; c->next_ = d;
        d2->next_ = x; x->next_ = c; // 链表2在 x 之后共享 c、d
        int val = -1;
        bool has = tmp.IsLinkHasMerge(d1, d2, val);
        cout << "相交链表: " << (has ? "相交" : "不相交(错误)")
             << " 交点=" << val << " (期望 3)" << endl;
        x->next_ = nullptr; // 断开共享再释放，避免重复 delete
        deleteList(d1);
        deleteList(d2);
    }

    // 用例2：不相交链表
    {
        Node *d1 = new Node();
        Node *d2 = new Node();
        Node *a = new Node(1), *b = new Node(2);
        Node *x = new Node(9), *y = new Node(8);
        d1->next_ = a; a->next_ = b;
        d2->next_ = x; x->next_ = y;
        int val = -1;
        bool has = tmp.IsLinkHasMerge(d1, d2, val);
        cout << "不相交链表: " << (has ? "相交(错误)" : "不相交(正确)") << endl;
        deleteList(d1);
        deleteList(d2);
    }
}

// RemoveNodefromHead 测试辅助：从数组构建链表（head 指向第一个数据节点）
Node* buildList(const vector<int>& arr) {
    Node *head = nullptr;
    Node *tail = nullptr;
    for (int v : arr) {
        Node *n = new Node(v);
        if (head == nullptr) head = n;
        else tail->next_ = n;
        tail = n;
    }
    return head;
}

// 把链表转成 vector，便于比较
vector<int> toVector(Node *head) {
    vector<int> v;
    while (head != nullptr) {
        v.push_back(head->data_);
        head = head->next_;
    }
    return v;
}

// 单条用例：删除 input 链表的倒数第 n 个节点，和 expect 比较
void checkRemove(Clink& tmp, const vector<int>& input, int n, const vector<int>& expect) {
    Node *head = buildList(input);
    head = tmp.RemoveNodefromHead(head, n);
    vector<int> got = toVector(head);
    bool ok = (got == expect);
    cout << "删倒数第" << n << "个: " << (ok ? "通过" : "失败");
    if (!ok) {
        cout << "  (期望 ";
        for (int v : expect) cout << v << " ";
        cout << "，得到 ";
        for (int v : got) cout << v << " ";
        cout << ")";
    }
    cout << endl;
    deleteList(head);
}

// RemoveNodefromHead 测试
void testRemoveNthFromEnd() {
    cout << "=== RemoveNodefromHead 测试 ===" << endl;
    Clink tmp; // 仅用作调用成员函数

    checkRemove(tmp, {1,2,3,4,5}, 1, {1,2,3,4});     // 删尾节点
    checkRemove(tmp, {1,2,3,4,5}, 2, {1,2,3,5});     // 删中间节点
    checkRemove(tmp, {1,2,3,4,5}, 5, {2,3,4,5});     // 删头节点
    checkRemove(tmp, {1},         1, vector<int>()); // 单节点删头，变空
    checkRemove(tmp, {1,2},       1, {1});           // 两个节点删尾
    checkRemove(tmp, {1,2},       2, {2});           // 两个节点删头
    checkRemove(tmp, {1,2,3},     4, {1,2,3});       // n 超出长度，不变
}

int main(){
    srand(time(0));

    // 随机插入 N 个节点，同时用数组记录，便于验证结果
    const int N = 10;
    int arr[N];
    Clink link;
    for (int i = 0; i < N; i++) {
        int val = rand() % 100; // 0-99 的随机数
        arr[i] = val;
        link.Inserttrail(val);
    }

    cout << "链表内容: ";
    link.Show();

    int val = 0;
    cout << "=== 倒数第 k 个节点测试 ===" << endl;

    // 正常情况：倒数第 k 个 = 数组 arr[N-k]
    if (link.GetLaskknode(link, 1, val)) {
        cout << "倒数第1个: " << val << " (期望 " << arr[N-1] << ")" << endl;
    }
    if (link.GetLaskknode(link, 3, val)) {
        cout << "倒数第3个: " << val << " (期望 " << arr[N-3] << ")" << endl;
    }
    if (link.GetLaskknode(link, N, val)) {
        cout << "倒数第" << N << "个: " << val << " (期望 " << arr[0] << ")" << endl;
    }

    // 边界情况
    //超出长度
    cout << "--- 边界情况 ---" << endl;
    if (!link.GetLaskknode(link, N + 1, val)) {
        cout << "k=" << N+1 << " 超出长度，返回 false (正确)" << endl;
    }
    //非法查询头节点
    if (!link.GetLaskknode(link, 0, val)) {
        cout << "k=0 非法，返回 false (正确)" << endl;
    }

    // 空链表
    Clink empty;
    if (!empty.GetLaskknode(empty, 1, val)) {
        cout << "空链表查询，返回 false (正确)" << endl;
    }

    cout << "=== MergeLink 测试 ===" << endl;
    testMerge(6, 5);  // 两个都非空
    testMerge(0, 5);  // link1 为空
    testMerge(5, 0);  // link2 为空
    testMerge(0, 0);  // 都为空
    testMerge(1, 1);  // 单节点

    testCircle();

    testIntersect();

    testRemoveNthFromEnd();

    return 0;
}