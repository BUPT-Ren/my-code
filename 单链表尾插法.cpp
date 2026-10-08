//单链表： 只能找到下一个节点 无法回退到上一个节点
//单链表有一个概念：头节点  head指针指向头节点
//将新增的第一个节点地址写进头节点

# include<iostream>
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
        //链表的头插法
        void Inserthead(int val){
            //先要有一个新节点
            Node *node = new Node(val);
            node->next_ = head_->next_;//先让新节点指向原先的首个节点
            head_->next_ = node; //再更新头节点的地址指向
        }

        
        //单链表中的节点删除操作  O（1）
        void Remove(int val){
            //按值删除
            //从第一个节点开始 头节点不存数据
            //不要随便判断p->next是否为空 容易漏掉尾节点
            Node *p = head_->next_; //让p指向第一个节点
            Node *q = head_;
            while(p != nullptr){
                if (p->data_ == val){
                    q->next_ = p->next_;
                    delete p; //p指针还存在
                    p = q->next_; // p 已被释放，需后移，否则野指针
                    return; //删除单个节点
                }
                else {
                    q = p;
                    p = p->next_;
                }
            }
        }
        //删除多个节点 多个bal
        void RemoveAll(int val){
              Node *p = head_->next_; //让p指向第一个节点
            Node *q = head_;
            while(p != nullptr){
                if (p->data_ == val){
                    q->next_ = p->next_;
                    delete p;
                    p = q->next_; // p 已被释放，需后移，否则野指针
                }
                else {
                    q = p;
                    p = p->next_;
                }
            }
        }
        //单链表的搜索接口
        bool find(int val){
            Node *p = head_->next_;
            while(p != nullptr)
            {
                if (p->data_ == val){
                    return true;
                }
                else
                    p = p->next_;
            }
            return false;
        }

        void Show() const {
            Node *p = head_->next_;
            while (p != nullptr) {
                cout << p->data_ << " ";
                p = p->next_;
            }
            cout << endl;
        }
    private:
        Node *head_;//指向链表的头节点
};

int main() {
    Clink list;

    cout << "=== 尾插法测试 ===" << endl;
    list.Inserttrail(10);
    list.Inserttrail(20);
    list.Inserttrail(30);
    cout << "尾插 10,20,30 后: ";
    list.Show();   // 期望: 10 20 30

    cout << "=== 头插法测试 ===" << endl;
    list.Inserthead(5);
    list.Inserthead(1);
    cout << "头插 5,1 后: ";
    list.Show();   // 期望: 1 5 10 20 30

    cout << "=== 按值删除测试 ===" << endl;
    list.Remove(10);
    cout << "删除 10 后: ";
    list.Show();   // 期望: 1 5 20 30

    list.Remove(1);
    cout << "删除 1(头节点)后: ";
    list.Show();   // 期望: 5 20 30

    list.Remove(30);
    cout << "删除 30(尾节点)后: ";
    list.Show();   // 期望: 5 20

    list.Remove(999);
    cout << "删除 999(不存在)后: ";
    list.Show();   // 期望: 5 20

    return 0;
}

