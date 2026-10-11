

#include<iostream>

using namespace std;

//定义双向链表的节点类型
//c++开源库的标准写法
struct Node{
    Node(int data = 0):
        data_(data),
        next_(nullptr),
        pre_(nullptr)
        {}
    int data_ ;//数据域
    Node *next_; //指向下一个节点
    Node *pre_; //指向上一个节点
};

//双向链表
class DoubleCircleLink{
    public:
        DoubleCircleLink(){
        //Node* head_ = new Node();  定义一个局部变量head_ 会覆盖成员变量
        head_ = new Node();
        //现在是循环链表
        //让两个指针都先指向自己
        head_->next_ = head_;
        head_->pre_ = head_;
        }
        ~DoubleCircleLink(){
            //先让p指向第一节点
            Node *p = head_->next_;
            while (p != head_){
                //这里是循环链表 
                head_->next_ = p->next_;
                p->next_->pre_ = head_;
                delete p;
                p = head_->next_; //p重新指向第一个节点
            }
            delete head_;
            head_ = nullptr;
        }
    public:
        //节点的插入
        //插入 头插法 尾插法 
        //头插法
          //头插法  和非循环一样 只是不再需要判空了
        void InsertHead(int val){
            //创建一个新节点
            Node *node = new Node(val);
            //让node指向下一个节点
            node->next_ = head_->next_;
            //让node指向头节点
            node->pre_ = head_;
            //存在第一节点
           // if (head_->next_ != nullptr){
            //让第一节点指向新节点
            head_->next_->pre_ = node;
           // }
            //让头节点指向新节点
            head_->next_ = node;
        }
        //尾插法 这里 head_->pre_ 就是尾节点
          void InsertTail(int val){
            Node *node  = new Node(val);
              //让p指向尾节点 
            Node *p = head_->pre_;
            //如果存在第一节点
            //尾插法 要先找到尾节点
         /*    while(p->next_ != nullptr){
                p = p->next_;
            } */
            node->pre_ = p;
            p->next_ = node;
            //更新一下循环的指
            node->next_ = head_;
            head_->pre_ = node;
        }
         //双向循环链表的节点删除
        //双向循环链表删除指定节点只需要一个指针
        void Remove(int val){
            Node *p = head_->next_;//让p指向第一个节点
            //while的循环条件应该是 p != head_;
            while (p != head_){
                if(p->data_ == val){
                    //删除p指向的节点
                    p->pre_->next_ = p->next_;
                //  if (p->next_ != nullptr){
                    p->next_->pre_ = p->pre_;
                //  }
                    Node *next = p->next_;//记录 因为可能不止删除一个节点
                    delete p; //此时p为野指针
                    p = next;
                }
                else{
                    p = p->next_;
                }
            }
        }
         //节点搜索
        bool Find(int val){
            Node *p = head_->next_;
            //要和头比较
            while (p != head_){
                if (p->data_ == val){
                    return true;
                }
                p = p->next_;
            }
            return false;
        }
        //链表节点的输出函数
        void show(){
            Node *p = head_->next_;
            //和头比较
            while(p != head_){
                cout << p->data_ << " ";
                p = p->next_;
            }
            cout << endl;
        }  
    private:
        Node *head_;
};

int main(){
    DoubleCircleLink list;

    // 测试1：空链表
    cout << "测试1 空链表 show（应输出空行）:" << endl;
    list.show();
    cout << "测试1 空链表 Find(1)（应输出 0）: " << list.Find(1) << endl;
    cout << "测试1 空链表 Remove(1)（不应崩溃，应输出空行）:" << endl;
    list.Remove(1);
    list.show();

    // 测试2：头插法
    cout << "测试2 头插 1,2,3（应输出 3 2 1）:" << endl;
    list.InsertHead(1);
    list.InsertHead(2);
    list.InsertHead(3);
    list.show();

    // 测试3：尾插法
    cout << "测试3 尾插 4,5（应输出 3 2 1 4 5）:" << endl;
    list.InsertTail(4);
    list.InsertTail(5);
    list.show();

    // 测试4：查找
    cout << "测试4 Find(3)=1, Find(5)=1, Find(100)=0:" << endl;
    cout << list.Find(3) << " " << list.Find(5) << " " << list.Find(100) << endl;

    // 测试5：删除中间节点
    cout << "测试5 删除 2（应输出 3 1 4 5）:" << endl;
    list.Remove(2);
    list.show();

    // 测试6：删除所有匹配的节点（含头、尾）
    cout << "测试6 插入 3 到头部和尾部后（应输出 3 3 1 4 5 3）:" << endl;
    list.InsertHead(3);
    list.InsertTail(3);
    list.show();
    cout << "测试6 删除所有 3（应输出 1 4 5）:" << endl;
    list.Remove(3);
    list.show();

    // 测试7：删除不存在的节点
    cout << "测试7 删除 999（应输出 1 4 5）:" << endl;
    list.Remove(999);
    list.show();

    // 测试8：删除头节点和尾节点
    cout << "测试8 删除 1 和 5（应输出 4）:" << endl;
    list.Remove(1);
    list.Remove(5);
    list.show();

    // 测试9：删空链表
    cout << "测试9 删除 4（应输出空行，Find(4) 应输出 0）:" << endl;
    list.Remove(4);
    list.show();
    cout << list.Find(4) << endl;

    return 0;
}